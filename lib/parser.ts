import type {
  Block,
  CodeBlock,
  HeadingBlock,
  ImageBlock,
  Link,
  ListBlock,
  ParagraphBlock,
  QuoteBlock,
  TextBody,
  TextBodyStyle,
  ThematicBreakBlock,
} from './definition';

export const parse = (input: string) => {
  const { head, body } = split(input);
  const frontmatter = parseFrontmatter(head);
  const blocks = parseBlocks(body);
  return { frontmatter, blocks };
};

export const split = (input: string) => {
  const trimmed = input.trim();
  const match = trimmed.match(/^(---\n[\s\S]*?---)\n*/);
  const head = match?.[1] || '';
  const body = trimmed.slice(head.length).trim();

  return {
    head,
    body,
  };
};

export const parseFrontmatter = (input: string): Record<string, string> => {
  const content = input.match(/---\n+([\s\S]+)---/)?.[1];
  if (!content) {
    return {};
  }

  const lines = content.split(/\n+/).filter((line) => line.trim() !== '');
  const map = new Map();
  for (const line of lines) {
    const match = line.match(/^(.+?):\s(.+)/);
    if (!match) {
      continue;
    }
    const [_, key, value] = match;
    if (!key || !value) {
      continue;
    }
    const trimmedKey = key.trim();
    const trimmedValue = value.trim().replace(/^["']?(.+?)["']?$/, '$1');

    map.set(trimmedKey, trimmedValue);
  }

  return Object.fromEntries(map);
};

export const parseBlocks = (input: string): Block[] => {
  if (input.trim() === '') {
    return [];
  }

  for (const [regexp, parser] of regexpToParserPairs) {
    if (regexp.test(input)) {
      const match = regexp.exec(input);
      if (!match) {
        throw new Error('Invalid block');
      }
      return [
        parser(match[0].trim()),
        ...parseBlocks(input.slice(match[0].length).trim()),
      ];
    }
  }

  throw new Error(`No matching block found for input: ${input}`);
};

const headingRegexp = new RegExp(/^(#{1,6})\s(.+)/);
const quoteRegexp = new RegExp(/^(?:>\s.*\n?)+/);
const listRegexp = new RegExp(/^(?:(?:-|\d+\.)\s(.+)\n?)+/);
const imageRegexp = new RegExp(/^!\[(.*)\]\((.+?)\)(.*)/);
const codeRegexp = new RegExp(/^```(\w+)?\n([\s\S]*?)\n```/);
const thematicBreakRegexp = new RegExp(/^-{3,}/);
const linkRegexp = new RegExp(/\[.+?\]\(.+?\)/);
const paragraphRegexp = new RegExp(/^([\s\S]+?)(?:\n|$)/);

export const parseParagraphBlock = (input: string): ParagraphBlock => ({
  type: 'paragraph',
  body: parseTextBody(input),
});

export const parseTextBody = (input: string): (TextBody | Link)[] => {
  const linkParsedTextList = parseLinkInText(input);
  return linkParsedTextList
    .map((item) =>
      typeof item === 'string'
        ? parseTextBodyStyle({
            text: item,
            progress: null,
            result: [],
          }).result
        : item,
    )
    .flat();
};

type TextBodyParseResult = {
  text: string;
  progress: { style: TextBodyStyle; text: string } | null;
  result: TextBody[];
};
export const parseTextBodyStyle = ({
  text,
  progress,
  result,
}: TextBodyParseResult): TextBodyParseResult => {
  if (text.length === 0) {
    // TODO: improve this part
    if (
      progress &&
      progress.style !== 'plain' &&
      result[result.length - 1].style === 'plain'
    ) {
      const mark =
        progress.style === 'code'
          ? '`'
          : progress.style === 'strong'
            ? '**'
            : '_';
      return {
        text,
        result: [
          ...result.slice(0, -1),
          {
            type: 'textBody',
            style: 'plain',
            value: result[result.length - 1].value + mark + progress.text,
          },
        ],
        progress: null,
      };
    }

    return {
      text,
      result: progress
        ? [
            ...result,
            {
              type: 'textBody',
              style: progress.style,
              value: progress.text,
            },
          ]
        : result,
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
            result: progress
              ? [
                  ...result,
                  {
                    type: 'textBody',
                    style: progressStyle,
                    value: progress.text,
                  },
                ]
              : result,
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
            {
              type: 'textBody',
              style: progressStyle,
              value: progress?.text ?? '',
            },
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

export const parseLinkInText = (input: string): (string | Link)[] => {
  const linkMatch = input.match(linkRegexp);

  if (!linkMatch) {
    return [input];
  }

  const [link] = linkMatch;
  const body = parseTextBodyStyle({
    text: link.match(/\[(.+)\]/)?.[1] ?? '',
    progress: null,
    result: [],
  }).result;
  const url = link.match(/\((.+)\)/)?.[1] ?? '';
  const linkBlock = {
    type: 'link',
    body,
    url,
  } satisfies Link;

  const linkStartIndex = input.indexOf(link);
  const before = input.slice(0, linkStartIndex);
  const after = input.slice(linkStartIndex + link.length);

  return [before, linkBlock, ...parseLinkInText(after)].filter(Boolean);
};

export const splitLinkFromText = (input: string): string[] => {
  const linkMatch = input.match(linkRegexp);

  if (!linkMatch) {
    return [input];
  }

  const [link] = linkMatch;

  const linkStartIndex = input.indexOf(link);
  const before = input.slice(0, linkStartIndex);
  const after = input.slice(linkStartIndex + link.length);

  return [before, link, ...splitLinkFromText(after)].filter(Boolean);
};

export const parseHeadingBlock = (input: string): HeadingBlock => {
  const match = headingRegexp.exec(input);
  if (!match) {
    throw new Error('Invalid heading block');
  }
  const level = match[1].length as HeadingBlock['level'];
  const text = match[2];
  return {
    type: 'heading',
    level,
    body: parseTextBody(text),
  };
};

export const parseQuoteBlock = (input: string): QuoteBlock => {
  const match = input.match(quoteRegexp);
  if (!match) {
    throw new Error('Invalid quote block');
  }
  const text = match[0].replace(/\n>[ ]?/g, '\n').replace(/^>\s/, '');
  return {
    type: 'quote',
    body: parseTextBody(text),
  };
};

export const parseListBlock = (input: string): ListBlock => {
  const lines = input.split(/\n+/).filter((line) => line.trim() !== '');
  const matches = lines.map((line) => line.match(listRegexp));
  const ordered = matches.every((match) => match && /^\d{1,}\./.test(match[0]));
  const items = lines.map((line) => parseListItem(line));

  return {
    type: 'list',
    ordered,
    items,
  };
};

const parseListItem = (line: string): ListBlock['items'][number] => {
  const match = line.match(listRegexp);
  if (!match) {
    throw new Error('Invalid list item');
  }
  const content = match[1];
  const body = parseTextBody(content);

  return {
    type: 'listItem',
    body,
  };
};

export const parseImageBlock = (input: string): ImageBlock => {
  const match = imageRegexp.exec(input);
  if (!match) {
    throw new Error('Invalid image block');
  }
  const altText = match[1];
  const url = match[2];
  const caption = match[3].replace(/^\((.+)\)$/, '$1') || '';

  return {
    type: 'image',
    url,
    altText,
    caption,
  };
};

export const parseCodeBlock = (input: string): CodeBlock => {
  const match = codeRegexp.exec(input);
  if (!match) {
    throw new Error('Invalid code block');
  }
  const lang = match[1] || undefined;
  const body = match[2];

  return {
    type: 'code',
    lang,
    body,
  };
};

export const parseThematicBreakBlock = (): ThematicBreakBlock => ({
  type: 'thematicBreak',
});

const regexpToParserPairs = [
  [headingRegexp, parseHeadingBlock],
  [quoteRegexp, parseQuoteBlock],
  [listRegexp, parseListBlock],
  [imageRegexp, parseImageBlock],
  [codeRegexp, parseCodeBlock],
  [thematicBreakRegexp, parseThematicBreakBlock],
  [paragraphRegexp, parseParagraphBlock],
] satisfies [RegExp, (input: string) => Block][];
