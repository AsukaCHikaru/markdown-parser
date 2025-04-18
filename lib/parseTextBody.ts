import type { TextBody, TextBodyStyle } from './definition';

type ParseResult = {
  text: string;
  progress: { style: TextBodyStyle; text: string } | null;
  result: { style: TextBodyStyle; text: string }[];
};

export const parseTextBody = (input: string): TextBody[] => {
  const { result } = parseTextBodyStyle({
    text: input,
    progress: null,
    result: [],
  });

  return result.map(({ style, text }) => ({
    type: 'textBody',
    style,
    value: text,
  }));
};

export const parseTextBodyStyle = ({
  text,
  progress,
  result,
}: ParseResult): ParseResult => {
  if (text.length === 0) {
    return {
      text,
      result: progress ? [...result, progress] : result,
      progress: null,
    };
  }

  const { style: headStyle, text: headText } = checkHeadStyle(text);
  const progressStyle = progress?.style;
  const first = headText[0];
  const rest = headText.slice(1);

  switch (progressStyle) {
    case undefined:
      return parseTextBodyStyle({
        text: rest,
        progress: { style: headStyle, text: first },
        result,
      });
    case 'plain':
      switch (headStyle) {
        case 'plain':
          return parseTextBodyStyle({
            text: rest,
            progress: { style: 'plain', text: (progress?.text ?? '') + first },
            result,
          });
        case 'code':
        case 'italic':
        case 'strong':
          return parseTextBodyStyle({
            text: rest,
            progress: { style: headStyle, text: first },
            result: progress ? [...result, progress] : result,
          });
        default:
          throw new Error(`Unexpected style: ${headStyle satisfies never}`);
      }
    case 'code':
    case 'italic':
    case 'strong':
      if (headStyle === progressStyle) {
        return parseTextBodyStyle({
          text: headText,
          progress: null,
          result: [
            ...result,
            { style: progressStyle, text: progress?.text ?? '' },
          ],
        });
      }
      return parseTextBodyStyle({
        text: rest,
        progress: {
          style: progressStyle,
          text: (progress?.text ?? '') + first,
        },
        result,
      });
    default:
      throw new Error(`Unexpected style: ${progressStyle satisfies never}`);
  }
};

const checkHeadStyle = (
  text: string,
): {
  style: TextBodyStyle;
  text: string;
} => {
  if (/^\*{2}/.test(text)) {
    return { style: 'strong', text: text.slice(2) };
  }
  if (/^\*{1}/.test(text)) {
    return { style: 'italic', text: text.slice(1) };
  }
  if (/^_{1}/.test(text)) {
    return { style: 'italic', text: text.slice(1) };
  }
  if (/^`{1}/.test(text)) {
    return { style: 'code', text: text.slice(1) };
  }
  return { style: 'plain', text };
};
