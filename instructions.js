class Instruction {
    constructor(short, id, requiredArgs, isError = false) {
        this.short = short;
        this.id = id;
        this.requiredArgs = requiredArgs;
        this.isError = isError;
    }
}

// Find the instruction based on the short name.
function getInstrucion(short) {
    for (let i = 0; i < instructions.length; i++) {
        const instruction = instructions[i];
        if (instruction.short == short) {
            return instruction;
        }
    }
    return new Instruction("HLT", 0, [], true);
}

let instructions = [
    new Instruction("HLT", 0, []),
    new Instruction("NOP", 1, []),
    new Instruction("ADR", 2, ["addressByte", "addressByte"]),
    new Instruction("LDA", 3, []),
    new Instruction("STA", 4, []),
    new Instruction("LDB", 5, []),
    new Instruction("SWP", 6, []),
    new Instruction("LDH", 7, []),
    new Instruction("LDL", 8, []),
    new Instruction("STH", 9, []),
    new Instruction("STL", 10, []),
    new Instruction("LDQ", 11, []),
    new Instruction("STQ", 12, []),
    new Instruction("CLA", 13, ["byte"]),
    new Instruction("CLB", 14, ["byte"]),
    new Instruction("CLQ", 15, ["byte"]),
    new Instruction("ADD", 20, []),
    new Instruction("ADDC", 21, []),
    new Instruction("SUB", 22, []),
    new Instruction("SUBC", 23, []),
    new Instruction("SHL", 24, []),
    new Instruction("SHLC", 25, []),
    new Instruction("SHR", 26, []),
    new Instruction("SHRC", 27, []),
    new Instruction("AND", 28, []),
    new Instruction("OR", 29, []),
    new Instruction("XOR", 30, []),
    new Instruction("NAND", 31, []),
    new Instruction("NOR", 32, []),
    new Instruction("XNOR", 33, []),
    new Instruction("CKSM", 34, []),
    new Instruction("CKSMC", 35, []),
    new Instruction("INCR", 36, []),
    new Instruction("DECR", 37, []),
    new Instruction("JMP", 38, []),
    new Instruction("JMPC", 39, []),
    new Instruction("JMPZ", 40, []),
    new Instruction("JMPQ", 41, []),
    new Instruction("PSH", 42, []),
    new Instruction("POP", 43, []),
    new Instruction("SUBR", 44, []),
    new Instruction("RET", 45, []),
];