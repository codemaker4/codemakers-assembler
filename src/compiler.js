let compiler;

window.onload = () => {
    compiler = new Compiler(
        document.getElementsByClassName("input")[0],
        document.getElementById("binOut")
    );
    document.getElementById("qrcode").onclick = () => {
        document.getElementById("qrcode").style.display = "none";
    }
}

class Compiler {
    constructor(codeInput, outputContainer) {
        this.codeInput = codeInput;
        this.outputContainer = outputContainer;
        this.compiledMemory = [];
        this.qrCode = undefined;
        this.instructionSet = new InstructionSet([
            new InstructionType("HLT",0,[]),
            new InstructionType("NOP",1,[]),

            new InstructionType("ADR",2,["address"]),
            new InstructionType("LDA",3,[]),
            new InstructionType("STA",4,[]),
            new InstructionType("LDB",5,[]),
            new InstructionType("SWP",6,[]),
            new InstructionType("LDH",7,[]),
            new InstructionType("LDL",8,[]),
            new InstructionType("STH",9,[]),
            new InstructionType("STL",10,[]),
            new InstructionType("LDQ",11,[]),
            new InstructionType("STQ",12,[]),
            new InstructionType("CLA",13,["byte"]),
            new InstructionType("CLB",14,["byte"]),
            new InstructionType("CLQ",15,["byte"]),

            new InstructionType("ADD",20,[]),
            new InstructionType("ADDC",21,[]),
            new InstructionType("SUB",22,[]),
            new InstructionType("SUBC",23,[]),
            new InstructionType("SHL",24,[]),
            new InstructionType("SHLC",25,[]),
            new InstructionType("SHR",26,[]),
            new InstructionType("SHRC",27,[]),
            new InstructionType("AND",28,[]),
            new InstructionType("OR",29,[]),
            new InstructionType("XOR",30,[]),
            new InstructionType("NAND",31,[]),
            new InstructionType("NOR",32,[]),
            new InstructionType("XNOR",33,[]),
            new InstructionType("CKSM",34,[]),
            new InstructionType("CKSMC",35,[]),
            new InstructionType("INCR",36,[]),
            new InstructionType("DECR",37,[]),

            new InstructionType("JMP",38,[]),
            new InstructionType("JMPC",39,[]),
            new InstructionType("JMPZ",40,[]),
            new InstructionType("JMPQ",41,[]),
            new InstructionType("PSH",42,[]),
            new InstructionType("POP",43,[]),
            new InstructionType("SUBR",44,[]),
            new InstructionType("RET",45,[])
        ]);
    }
    compileFull() {
        let inputText = this.codeInput.innerText;
        let i = 0;
        let line = 0;
        let labels = []; // {name:<name>,address:<compiledMemoryIndex>}
        let errors = [];

        this.compiledMemory = [];

        while (i < inputText.length) {
            let getLinePartsOutput = this.getLineParts(inputText, i);
            // console.log(getLinePartsOutput, i, line);
            i = getLinePartsOutput.i;
            let parts = getLinePartsOutput.parts;
            let error = getLinePartsOutput.error;

            if (error) {
                // console.log("parsed syntax error");
                for (let j = 0; j < parts.length; j++) {
                    const part = parts[j];
                    if (part.type == "error") {
                        errors.push("Error on line " + line.toString() + ": Could not understand '" + part.text + "'.");
                    }
                }
                line ++;
                continue;
            }
            if (parts.length == 0) {
                // console.log("parsed newline");
                line ++;
                continue;
            }

            if (parts[0].type == "instruction") {
                let checkInstructionResult = this.instructionSet.checkInstruction(parts)
                if (!checkInstructionResult.error) {
                    // console.log("validated instruction", parts);
                } else {
                    // console.log("instruction invalid", checkInstructionResult.errorList, i, line, parts);
                    for (let i = 0; i < checkInstructionResult.errorList.length; i++) {
                        const error = checkInstructionResult.errorList[i];
                        errors.push("Error on line " + line.toString() + ": " + error);
                    }
                    line++
                    continue;
                }
            }

            if (parts[0].type == "label") {
                labels.push({
                    name:parts[0].text.slice(1),
                    address:this.compiledMemory.length
                })
                parts = parts.slice(1); // remove label from parts to be parsed, so values written after the label are still read.
            }

            for (let j = 0; j < parts.length; j++) {
                const part = parts[j];
                if (part.type == "address") {
                    this.compiledMemory.push(new CompiledByte({
                        type:"addressH",
                        text:part.text
                    }, line));
                    this.compiledMemory.push(new CompiledByte({
                        type:"addressL",
                        text:part.text
                    }, line));
                } else {
                    this.compiledMemory.push(new CompiledByte(part, line));
                }
            }

            line ++;
        }

        for (let i = 0; i < this.compiledMemory.length; i++) {
            const compiledByte = this.compiledMemory[i];
            let compiledByteOut = compiledByte.compile(this.instructionSet, labels);
            if (compiledByteOut.error) {
                // console.log("error on line" + compiledByteOut.errorLine.toString() + ":" + compiledByteOut.errorText);
                errors.push("error on line" + compiledByteOut.errorLine.toString() + ": " + compiledByteOut.errorText);
            }
        }

        let outBin = ""
        if (errors.length == 0) {
            for (let i = 0; i < this.compiledMemory.length; i++) {
                const compiledByte = this.compiledMemory[i];
                outBin += compiledByte.byteBin + "<br>";
            }
        } else {
            for (let i = 0; i < errors.length; i++) {
                const error = errors[i];
                outBin += error + "<br>";
            }
        }

        this.outputContainer.innerHTML = outBin;

        console.log("compiling done");
    }
    startMakeQR() {
        document.getElementById("makeQRbutton").innerText = "making QR code...";
        setTimeout(() => {this.makeQR()},0);
    }
    makeQR() {
        let qrCodeText = "https://codemaker4.github.io/codemakers-compiler/binaryViewer/?";
        for (let i = 0; i < this.compiledMemory.length; i++) {
            const compiledByte = this.compiledMemory[i];
            if (compiledByte.type == "error") {
                qrCodeText += "error";
            } else {
                qrCodeText += compiledByte.byteBin;
            }
            if (i+1 < this.compiledMemory.length) {
                qrCodeText += "-";
            }
        }
        try {
            if (this.qrCode === undefined) {
                document.getElementById("qrcode").innerHTML = "";
                this.qrCode =   new QRCode(document.getElementById("qrcode"), {
                    text: qrCodeText,
                    width: 1024,
                    height: 1024,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.L
                });
            } else {
                this.qrCode.clear();
                this.qrCode.makeCode(qrCodeText);
            }
        } catch (error) {
            document.getElementById("qrcode").innerText = "There was an error creating the QR code.";
            this.qrCode = undefined;
        }

        document.getElementById("qrcode").style.display = "block";
        document.getElementById("makeQRbutton").innerText = "make QR code";
    }
    getLineParts(inputText, i) {
        let lineText = "";
        while (inputText[i] != "\n" && i < inputText.length) {
            lineText += inputText[i];
            i++;
        }
        i++; // make I the first char of the next line for returning

        if (lineText.length == 0) {
            return {
                i:i,
                parts:[],
                error:false,
                empty:true
            };
        }
        if (lineText.indexOf('-') != -1) {
            lineText = lineText.slice(0,lineText.indexOf('-'));
        }

        let rawParts = lineText.split(" ");
        let parts = [];
        let hasError = false;
        for (let j = 0; j < rawParts.length; j++) {
            const rawPart = rawParts[j];
            if (rawPart.length == 0) {
                continue;
            }
            let type;
            if (!/[^A-Z]/g.test(rawPart)) {
                type = "instruction";
            } else if (/^@[a-zA-Z_]+$/.test(rawPart)) {
                type = "address";
            } else if (/^:[a-zA-Z_]+$/.test(rawPart)) {
                type = "label";
            } else if (/^[#$%][0-9a-fA-F]+$/.test(rawPart) || /^@[a-zA-Z_]+\.[hl]$/.test(rawPart)) {
                type = "byte";
            } else {
                type = "error";
                hasError = true;
            }
            parts.push({
                type:type,
                text:rawPart
            });
        }

        return {
            i:i,
            parts:parts,
            error:hasError,
            empty:false
        };
    }
}

class CompiledByte {
    constructor(part, origLine) {
        this.part = part; // {type:<instruction, address or byte>}
        this.origLine = origLine;
        this.byteBin = "00000000";
    }
    compile(instructionSet, labels) {
        if (this.part.type == "addressH" || this.part.type == "addressL") {
            let address = undefined;
            for (let i = 0; i < labels.length; i++) {
                const label = labels[i];
                if (label.name == this.part.text.slice(1)) {
                    address = label.address
                    break;
                }
            }
            if (address === undefined) {
                return {
                    error:true,
                    errorLine:this.origLine,
                    errorText:"Could not find address for pointer"
                }
            }
            if (this.part.type == "addressH") {
                this.byteBin = convertToByte(Math.floor(address/256));
            } else { // address L
                this.byteBin = convertToByte(address%256);
            }
        } else if (this.part.type == "instruction") {
            let foundInstruction = undefined
            for (let i = 0; i < instructionSet.instructions.length; i++) {
                const instruction = instructionSet.instructions[i];
                if (instruction.name == this.part.text) {
                    foundInstruction = instruction;
                }
            }
            if (foundInstruction === undefined) {
                return {
                    error:true,
                    errorLine:this.origLine,
                    errorText:"Could not find instruction"
                }
            }
            this.byteBin = convertToByte(foundInstruction.id);
        } else if (this.part.type == "byte") {
            let numText = this.part.text.slice(1);
            let num;
            switch (this.part.text[0]) {
                case "%":
                    if (!/^[0-1]{1,8}$/.test(numText)) {
                        return {
                            error:true,
                            errorLine: this.origLine,
                            errorText:"Binary value invalid or too large for single byte"
                        }
                    }
                    this.byteBin = "0".repeat(Math.max(8-numText.length,0)) + numText
                    break;
                
                case "#":
                    if (parseInt(numText) === NaN) {
                        return {
                            error:true,
                            errorLine: this.origLine,
                            errorText:"Decimal value could not be parsed"
                        }
                    }
                    num = parseInt(numText)
                    if (num < 0 || num >= 256) {
                        return {
                            error:true,
                            errorLine: this.origLine,
                            errorText:"Decimal value either negative or too large for single byte"
                        }
                    }
                    this.byteBin = convertToByte(num);
                    break;

                case "$":
                    if (parseInt(numText, 16) === NaN) {
                        return {
                            error:true,
                            errorLine: this.origLine,
                            errorText:"Hexadecimal value could not be parsed"
                        }
                    }
                    num = parseInt(numText, 16)
                    if (num < 0 || num >= 256) {
                        return {
                            error:true,
                            errorLine: this.origLine,
                            errorText:"Hexadecimal value either negative or too large for single byte"
                        }
                    }
                    this.byteBin = convertToByte(num);
                    break;

                case "@":
                    let address = undefined;
                    for (let i = 0; i < labels.length; i++) {
                        const label = labels[i];
                        if (label.name == numText.slice(0, -2)) {
                            address = label.address
                            break;
                        }
                    }
                    if (address === undefined) {
                        return {
                            error:true,
                            errorLine:this.origLine,
                            errorText:"Could not find address for pointer"
                        }
                    }
                    if (numText.slice(-2) == ".h") {
                        this.byteBin = convertToByte(Math.floor(address/256));
                    } else { // address L
                        this.byteBin = convertToByte(address%256);
                    }
                    break;

                default:
                    return {
                        error:true,
                        errorLine: this.origLine,
                        errorText:"Invalid value datatype in CompiledByte.parse. This is a bug, please report."
                    }
                    break;
            }
        } else if (this.part.type == "error") {
            return {
                error:true,
                errorLine: this.origLine,
                errorText:"Could not parse part"
            } 
        } else {
            return {
                error:true,
                errorLine: this.origLine,
                errorText:"Invalid part type."
            }    
        }
        return {
            error:false
        }
    }
}

class InstructionType {
    constructor(name, id, args) {
        this.name = name;
        this.id = id;
        this.args = args;
    }
}

class InstructionSet {
    constructor(instructions) {
        this.instructions = instructions;
    }
    checkInstruction(parts) {
        let foundInstruction = undefined
        for (let i = 0; i < this.instructions.length; i++) {
            const instruction = this.instructions[i];
            if (instruction.name == parts[0].text) {
                foundInstruction = instruction;
            }
        }
        if (foundInstruction === undefined) {
            return {
                error:true,
                errorList:["Could not find instruction " + parts[0].text]
            }
        }
        let argErrors = []; // strings giving error descriptions
        let args = parts.slice(1);
        let givArgI = 0;
        let expArgI = 0;
        while (givArgI < args.length || expArgI < foundInstruction.args.length) {
            if (foundInstruction.args[expArgI] === undefined) {
                argErrors.push("Error on argument " + expArgI.toString() + ": Too many arguments");
            } else if (args[givArgI] === undefined) {
                argErrors.push("Error on argument " + expArgI.toString() + ": Not enaugh arguments, expected " + foundInstruction.args[expArgI]);
            } else {
                switch (foundInstruction.args[expArgI]) {
                    case "address":
                        if (args[givArgI].type == "addressH") {
                            givArgI ++; // to skip the addressL
                        } else if (args[givArgI].type == "byte") {
                            argErrors.push("Error on argument " + expArgI.toString() + ": Got a byte, expected a pointer")
                        } else if (args[givArgI].type == "byte") {
                            argErrors.push("Error on argument " + expArgI.toString() + ": Got a instruction, expected a pointer")
                        }
                        break;
                    case "byte":
                        if (args[givArgI].type == "addressH") {
                            argErrors.push("Error on argument " + expArgI.toString() + ": Got a pointer, expected a byte")
                            givArgI ++; // to skip the addressL
                        } else if (args[givArgI].type == "byte") {
                            // good
                        } else if (args[givArgI].type == "byte") {
                            argErrors.push("Error on argument " + expArgI.toString() + ": Got a instruction, expected a byte")
                        }
                        break;
                    default:
                        argErrors.push("Error on argument " + expArgI.toString() + ": Not recognized expected argument type. This is a bug, contact CM4")
                        break;
                }
            }
            givArgI ++;
            expArgI ++;
        }
        return {
            error:argErrors.length >= 1,
            errorList:argErrors
        }
    }
}

function convertToByte(num) {
    let out = num.toString(2);
    out = "0".repeat(Math.max(8-out.length,0)) + out;
    return out;
}