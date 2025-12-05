export const cleanTargetWord = (word: string): string => {
    // Remove content in [] or ()
    return word.replace(/\[.*?\]|\(.*?\)/g, '');
};

export const validateAnswer = (
    input: string,
    target: string,
    reading: string | null
): boolean => {
    const normalizedInput = input.trim().toLowerCase();
    const normalizedTarget = target.toLowerCase();
    const cleanedTarget = cleanTargetWord(normalizedTarget);
    const normalizedReading = reading?.toLowerCase();

    // 1. Exact match with original target
    if (normalizedInput === normalizedTarget) return true;

    // 2. Exact match with cleaned target (ignoring brackets)
    if (normalizedInput === cleanedTarget) return true;

    // 3. Match with reading
    if (normalizedReading && normalizedInput === normalizedReading) return true;

    return false;
};
