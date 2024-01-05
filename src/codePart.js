class CodePart {
    constructor(origLine, origCode) {
        this.origLine = origLine;
        this.origCode = origCode;
        this.hasError = false;
        this.type = "";
        this.output = "";
        this.outputNum = undefined;
        this.address = undefined;
        this.debugLog = "";

        if (/^[A-Z]+$/.test(origCode)) {
            this.type = "instruction";
            this.output = origCode;
        } else if (/^@[a-zA-Z_-]+$/.test(origCode)) {
            this.type = "address";
            this.output = origCode.slice(1);
        } else if (/^@[a-zA-Z_-]+\.[hl]$/.test(origCode)) {
            this.type = "addressByte";
            this.output = origCode.slice(1);
        } else if (/^[0-9a-zA-Z_-]+:$/.test(origCode)) {
            this.type = "label";
            this.output = origCode.slice(0, -1);
        } else if (/^(0b|0x|)[0-9a-fA-F]+$/.test(origCode)) {
            this.type = "byte";
            this.output = origCode;

        } else {
            this.type = "invalid";
            this.output = origCode;
            this.debugLog += `ERROR invalid codepart: The piece of code "${origCode}" from line #${origLine} could not be interpereted, because it did not match any valid type of code part. You probably made a typo or misunderstood the syntax.\n`;
            this.hasError = true;
        }
        if (!this.hasError) {
            this.debugLog += `The piece of code "${origCode}" from line #${origLine} was interpereted to be of type "${this.type}".\n`;
        }
    }
}