let compiler;

window.onload = () => {
    let sourceCode = localStorage.getItem("SMPU_assembler_opened_source_code");
    if (sourceCode) {
        document.getElementById("input").innerText = sourceCode;
    }

    compiler = new Compiler(
        document.getElementById("input"),
        document.getElementById("binOut")
    );
    document.getElementById("qrcode").onclick = () => {
        document.getElementById("qrcode").style.display = "none";
    }

    doLineNumbers();
    compiler.compile();

    let processTimeout;
    document.getElementById("input").onkeydown = () => {
        clearTimeout(processTimeout);
        processTimeout = setTimeout(() => {
            localStorage.setItem("SMPU_assembler_opened_source_code", document.getElementById("input").innerText);
            doLineNumbers();
            compiler.compile();
            processTimeout = 0;
        },1000);
    };
}

function doLineNumbers() {
    let newText = "";
    let lineNumbers = document.getElementById("input").innerText.split("\n").length;
    for (let i = 0; i < lineNumbers; i++) {
        newText += `${i}\n`;
    }
    document.getElementById("lineNumbers").innerText = newText + "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n";
}

class Compiler {
    constructor(input, output) {
        this.input = input;
        this.output = output;
        this.codeParts = [];
    }

    /* Compiles the code in the given input element, and puts compiled binary in the output
    */
    compile() {
        // parse text and split to parts, keep track of source line numbers, give errors for invalid part syntax

        let sourceCodeLines = this.input.innerText
            .replace(/\</g, "") // remove HTML tags
            .replace(/&.{0,4};/g, "") // remove HTML char codes
            .split("\n"); // and split per newline

        console.log(sourceCodeLines);

        this.codeParts = [];

        for (let lineNumber = 0; lineNumber < sourceCodeLines.length; lineNumber++) {
            let line = sourceCodeLines[lineNumber];

            if (line.length == 0) {continue}
            
            if (line.indexOf('-') != -1) {
                line = line.slice(0, line.indexOf('-'));
            }

            while (line[0] == " ") {
                line = line.slice(1);
            }
    
            let partTexts = line.split(" ");
            for (let i = 0; i < partTexts.length; i++) {
                if (partTexts[i].length > 0) {
                    this.codeParts.push(new CodePart(lineNumber, partTexts[i]));
                }
            }
        }

        // split addresses into H and L byte parts

        for (let i = 0; i < this.codeParts.length; i++) {
            const codePart = this.codeParts[i];
            if (codePart.hasError) {
                continue;
            }

            if (codePart.type == "address") {
                this.codeParts.splice(i, 1,
                    new CodePart(codePart.origLine, codePart.origCode + ".h"),
                    new CodePart(codePart.origLine, codePart.origCode + ".l"),
                );
                this.codeParts[i].debugLog += "This address was split. This is only the high 8 bits.\n";
                i++;
                this.codeParts[i].debugLog += "This address was split. This is only the low 8 bits.\n";
            }
        }

        // check if instructions exist and have correct number of byte arguments and arguments are on same source line as instruction

        for (let i = 0; i < this.codeParts.length; i++) {
            const codePart = this.codeParts[i];
            if (codePart.hasError) {
                continue;
            }

            if (codePart.type == "instruction") {
                const instruction = getInstrucion(codePart.origCode);
                if (instruction.isError) {
                    codePart.debugLog += `ERROR instruction not found: Could not find an instruction with name "${codePart.origCode}". Check the spelling, or if this is not supposed to be an instruction, check the syntax.\n`;
                    codePart.hasError = true;
                    continue;
                }

                if (instruction.requiredArgs.length == 0) {
                    codePart.debugLog += `This instruction requires no arguments.\n`;
                    continue;
                }

                for (let j = 0; j < instruction.requiredArgs.length; j++) {
                    i++;
                    if (this.codeParts[i] === undefined || codePart.origLine !== this.codeParts[i].origLine) {
                        codePart.debugLog += `ERROR argument missing: The instruction "${instruction.short}" requires ${instruction.requiredArgs.length} arguments, but only ${j} arguments were given. Arguments of instructions need to be on the same line of code as the original instruction.\n`;
                        codePart.hasError = true;
                        break;
                    }
                    if (this.codeParts[i].hasError) {
                        codePart.debugLog += `ERROR argument has error: The instruction "${instruction.short}" requires ${instruction.requiredArgs.length} arguments, but argument number ${j + 1} has had an error in previous steps of the compilation.\n`;
                        codePart.hasError = true;
                        continue;
                    }
                    if (instruction.requiredArgs[j] !== this.codeParts[i].type) {
                        codePart.debugLog += `ERROR argument wrong type: The instruction "${instruction.short}" got the wrong type of argument. Argument number ${j} is supposed to be of type "${instruction.requiredArgs[j]}", but an argument of type ${this.codeParts[i].type} was found instead. This is what that argument looked like: "${this.codeParts[i].origCode}.\n"`;
                        codePart.hasError = true;
                        continue;
                    }
                }

                if (!codePart.hasError) {
                    codePart.debugLog += `This instruction has the required arguments.\n`;
                }
            }
        }

        // process pseudo instructions into real assembly
        // there are no pseudo instructions yet


        // process and save addresses of label parts and calculate memory addresses of other codeParts.

        let labels = []; // [{label: name, address: address, origLine: origLine}]
        let address = 0;

        for (let i = 0; i < this.codeParts.length; i++) {
            const codePart = this.codeParts[i];
            if (codePart.hasError) {
                address++;
                continue;
            }

            codePart.address = address;

            if (codePart.type == "label") {
                let found = labels.find((label)=>{label.label == codePart.output});
                if (found !== undefined) {
                    codePart.debugLog += `ERROR label already defined: This label was already defined at line ${found.origLine}. You can't have two labels with the same name.`;
                    codePart.hasError = true;
                    continue;
                }

                if (address < 0 || address >= 65536) {
                    codePart.debugLog += `ERROR label address out of 16 bit range: The address of this label is out of the 16 bit address range.`;
                    codePart.hasError = true;
                    continue;
                }

                labels.push({"label": codePart.output, "address": address, "origLine": codePart.origLine});
                codePart.debugLog += `This label is registered to address ${address}.\n`;
            } else {
                address++;
            }
        }


        // convert text parts to 8-bit numbers, including addresses

        for (let i = 0; i < this.codeParts.length; i++) {
            const codePart = this.codeParts[i];
            if (codePart.hasError) {
                continue;
            }

            switch (codePart.type) {
                case "invalid":
                    codePart.debugLog += "ERROR oops invalid non-error codepart: This codepart is invalid, but the compiler tried to process it further anyway. Please report this.\n";
                    codePart.hasError = true;
                    break;
                
                case "instruction":
                    const instruction = getInstrucion(codePart.origCode);
                    if (instruction.isError) {
                        codePart.debugLog += "ERROR oops instruction invalid: This instruction is invalid, but the compiler tried to process it further anyway. Please report this.\n";
                        codePart.hasError = true;
                        break;
                    }
                    if (instruction.id < 0 || instruction.id >= 256) {
                        codePart.debugLog += "ERROR oops instruction id out of range: This instruction has an invalid id, but the compiler tried to process it further anyway. Please report this.\n";
                        codePart.hasError = true;
                        break;
                    }

                    codePart.outputNum = instruction.id;
                    codePart.output = instruction.id.toString(2);
                    while(codePart.output.length < 8) {
                        codePart.output = "0" + codePart.output;
                    }
                    break;
                
                case "address":
                    codePart.debugLog += "ERROR oops forgot split address: The compiler forgot to split up this address into seperate bytes. Please report this.\n";
                    codePart.hasError = true;
                    break;

                case "addressByte":
                    let labelName = codePart.output.slice(0, -2);
                    let hilo = codePart.output.slice(-1);
                    if (labelName.length === 0 || (hilo !== "h" && hilo !== "l")) {
                        codePart.debugLog + `ERROR oops invalid address byte: AddressByte "${codePart.output}" seems invalid. This is probably an actual syntax error in your code, but the compiler should have caught this earlier. Please report this.`;
                        codePart.hasError = true;
                        break;
                    }

                    let label = labels.find(label=>label.label == labelName);
                    if (label === undefined) {
                        codePart.debugLog += `ERROR label not found: Could not find label "${labelName}". Perhaps you made a typo in the case sensitive label name, or your label decleration had an error.`;
                        codePart.hasError = true;
                        break;
                    }

                    if (label.address < 0 || label.address >= 65536) {
                        codePart.debugLog += `ERROR oops address out of 16 bit range: The address of this label (defined on line #${label.origLine}) is out of the 16 bit range. The compiler should have caught this earlier. Please report this.\n`;
                        codePart.hasError = true;
                        break;
                    }

                    if (hilo == "h") {
                        codePart.outputNum = Math.floor(label.address / 256);
                    } else {
                        codePart.outputNum = label.address % 256;
                    }
                    if (codePart.outputNum < 0 || codePart.outputNum >= 256) {
                        codePart.debugLog += `ERROR oops address byte out of range: Converting this label number to byte parts resulted in a byte out of range. Please report this.\n`;
                        codePart.hasError = true;
                        break;
                    }

                    codePart.debugLog += `This addressByte was converted to binary. Note that this byte is just half of an address.\n`;
                    codePart.output = codePart.outputNum.toString(2);
                    while(codePart.output.length < 8) {
                        codePart.output = "0" + codePart.output;
                    }
                    break;
                
                case "label":
                    codePart.debugLog += `Labels themselves don't actually get stored in the program output.\n`;
                    break;

                case "byte":
                    let num = Number(codePart.output);

                    if (num === undefined || isNaN(num)) {
                        codePart.debugLog += `ERROR byte invalid syntax: Could not interperet this byte/number. Check the syntax.\n`;
                        codePart.hasError = true;
                        break;
                    }

                    if (num < 0 || num >= 256) {
                        codePart.debugLog += `ERROR byte out of range: This number (${num}) is outside the range of numbers that fit in an unsigned 8bit integer. If you tried entering a negative number, those aren't yet supported in the compiler, so you will have to apply 2's complement manually.\n`;
                        codePart.hasError = true;
                        break;
                    }

                    codePart.outputNum = num;
                    codePart.output = num.toString(2);
                    while(codePart.output.length < 8) {
                        codePart.output = "0" + codePart.output;
                    }
                    break;
                
                case "macro":
                    codePart.debugLog += "ERROR oops forgot process macro: The compiler forgot to process and remove this macro. Please report this.\n";
                    codePart.hasError = true;
                    break;

                default:
                    break;
            }
        }

        let newHTML = `<table>`;

        for (let i = 0; i < this.codeParts.length; i++) {
            const codePart = this.codeParts[i];

            if (codePart.hasError) {
                let firstError = codePart.debugLog.split("\n").find((line)=>line.indexOf("ERROR") != -1);
                codePart.output += ` ${firstError.substring(0, firstError.indexOf(":"))}`;
            }

            if (codePart.type == "label") {
                codePart.output += ":";
            }

            if (codePart.address === undefined) {
                codePart.address = "";
            }

            newHTML+= `<tr><td>${codePart.address}</td><td title="${codePart.debugLog.replaceAll('"', "'")}">${codePart.output}</td></tr>`
        }

        newHTML += `</table>`;
        this.output.innerHTML = newHTML;
    }
}