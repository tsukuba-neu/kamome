const emojiPattern =
  /[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D]/gu;

export function removeEmoji(text: string): string {
  return text.replace(emojiPattern, "");
}
