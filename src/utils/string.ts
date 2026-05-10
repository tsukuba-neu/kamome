const emojiPattern =
  /(?:[#*0-9]\uFE0F?\u20E3|\p{Regional_Indicator}{2}|(?:[\p{Extended_Pictographic}\p{Emoji_Presentation}](?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D[\p{Extended_Pictographic}\p{Emoji_Presentation}](?:\uFE0F|\p{Emoji_Modifier})?)*))/gu;

export function removeEmoji(text: string): string {
  return text.replace(emojiPattern, "");
}
