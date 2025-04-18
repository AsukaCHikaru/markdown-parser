import type { Block, HeadingBlock, QuoteBlock } from './definition';
import {
  parse,
  parseBlock,
  parseHeadingBlock,
  parseQuoteBlock,
} from './parser';
import { describe, expect, test } from 'bun:test';

describe('parseHeadingBlock', () => {
  test('parses H1 heading', () => {
    const input = '# Heading 1';
    const expected: HeadingBlock = {
      type: 'heading',
      level: 1,
      body: [
        {
          type: 'textBody',
          style: 'plain',
          value: 'Heading 1',
        },
      ],
    };
    expect(parseHeadingBlock(input)).toEqual(expected);
  });

  test('parses H2 heading', () => {
    const input = '## Heading 2';
    const expected: HeadingBlock = {
      type: 'heading',
      level: 2,
      body: [
        {
          type: 'textBody',
          style: 'plain',
          value: 'Heading 2',
        },
      ],
    };
    expect(parseHeadingBlock(input)).toEqual(expected);
  });

  test('parses H6 heading', () => {
    const input = '###### Heading 6';
    const expected: HeadingBlock = {
      type: 'heading',
      level: 6,
      body: [
        {
          type: 'textBody',
          style: 'plain',
          value: 'Heading 6',
        },
      ],
    };
    expect(parseHeadingBlock(input)).toEqual(expected);
  });

  test('parses heading with styled text', () => {
    const input = '# Heading with **strong** and *italic* text';
    const expected: HeadingBlock = {
      type: 'heading',
      level: 1,
      body: [
        {
          type: 'textBody',
          style: 'plain',
          value: 'Heading with ',
        },
        {
          type: 'textBody',
          style: 'strong',
          value: 'strong',
        },
        {
          type: 'textBody',
          style: 'plain',
          value: ' and ',
        },
        {
          type: 'textBody',
          style: 'italic',
          value: 'italic',
        },
        {
          type: 'textBody',
          style: 'plain',
          value: ' text',
        },
      ],
    };
    expect(parseHeadingBlock(input)).toEqual(expected);
  });
});

describe('parseQuoteBlock', () => {
  test('parses simple quote', () => {
    const input = '> This is a quote';
    const expected: QuoteBlock = {
      type: 'quote',
      body: [
        {
          type: 'textBody',
          style: 'plain',
          value: 'This is a quote',
        },
      ],
    };
    expect(parseQuoteBlock(input)).toEqual(expected);
  });

  test('parses quote with styled text', () => {
    const input = '> Quote with **strong** and *italic* text';
    const expected: QuoteBlock = {
      type: 'quote',
      body: [
        {
          type: 'textBody',
          style: 'plain',
          value: 'Quote with ',
        },
        {
          type: 'textBody',
          style: 'strong',
          value: 'strong',
        },
        {
          type: 'textBody',
          style: 'plain',
          value: ' and ',
        },
        {
          type: 'textBody',
          style: 'italic',
          value: 'italic',
        },
        {
          type: 'textBody',
          style: 'plain',
          value: ' text',
        },
      ],
    };
    expect(parseQuoteBlock(input)).toEqual(expected);
  });
});

describe('parseBlock', () => {
  test('parses heading block', () => {
    const input = '# Heading 1';
    const expected: Block = {
      type: 'heading',
      level: 1,
      body: [
        {
          type: 'textBody',
          style: 'plain',
          value: 'Heading 1',
        },
      ],
    };
    expect(parseBlock(input)).toEqual(expected);
  });

  test('parses quote block', () => {
    const input = '> This is a quote';
    const expected: Block = {
      type: 'quote',
      body: [
        {
          type: 'textBody',
          style: 'plain',
          value: 'This is a quote',
        },
      ],
    };
    expect(parseBlock(input)).toEqual(expected);
  });

  test('parses paragraph block by default', () => {
    const input = 'This is a paragraph';
    const expected: Block = {
      type: 'paragraph',
      body: [
        {
          type: 'textBody',
          style: 'plain',
          value: 'This is a paragraph',
        },
      ],
    };
    expect(parseBlock(input)).toEqual(expected);
  });

  test('parses paragraph with styled text', () => {
    const input = 'Paragraph with **strong** and *italic* text';
    const expected: Block = {
      type: 'paragraph',
      body: [
        {
          type: 'textBody',
          style: 'plain',
          value: 'Paragraph with ',
        },
        {
          type: 'textBody',
          style: 'strong',
          value: 'strong',
        },
        {
          type: 'textBody',
          style: 'plain',
          value: ' and ',
        },
        {
          type: 'textBody',
          style: 'italic',
          value: 'italic',
        },
        {
          type: 'textBody',
          style: 'plain',
          value: ' text',
        },
      ],
    };
    expect(parseBlock(input)).toEqual(expected);
  });
});

describe('parse', () => {
  test('parses multiple blocks', () => {
    const input = '# Heading 1\n> This is a quote\nThis is a paragraph';
    const expected: Block[] = [
      {
        type: 'heading',
        level: 1,
        body: [
          {
            type: 'textBody',
            style: 'plain',
            value: 'Heading 1',
          },
        ],
      },
      {
        type: 'quote',
        body: [
          {
            type: 'textBody',
            style: 'plain',
            value: 'This is a quote',
          },
        ],
      },
      {
        type: 'paragraph',
        body: [
          {
            type: 'textBody',
            style: 'plain',
            value: 'This is a paragraph',
          },
        ],
      },
    ];
    expect(parse(input)).toEqual(expected);
  });

  test('parses empty lines as empty paragraphs', () => {
    const input = '# Heading 1\n\n> This is a quote';
    const expected: Block[] = [
      {
        type: 'heading',
        level: 1,
        body: [
          {
            type: 'textBody',
            style: 'plain',
            value: 'Heading 1',
          },
        ],
      },
      {
        type: 'quote',
        body: [
          {
            type: 'textBody',
            style: 'plain',
            value: 'This is a quote',
          },
        ],
      },
    ];
    expect(parse(input)).toEqual(expected);
  });

  test('parses complex document with mixed blocks', () => {
    const input =
      '# Heading 1\n## Heading 2\n> Quote with **strong** text\nParagraph with *italic* text';
    const expected: Block[] = [
      {
        type: 'heading',
        level: 1,
        body: [
          {
            type: 'textBody',
            style: 'plain',
            value: 'Heading 1',
          },
        ],
      },
      {
        type: 'heading',
        level: 2,
        body: [
          {
            type: 'textBody',
            style: 'plain',
            value: 'Heading 2',
          },
        ],
      },
      {
        type: 'quote',
        body: [
          {
            type: 'textBody',
            style: 'plain',
            value: 'Quote with ',
          },
          {
            type: 'textBody',
            style: 'strong',
            value: 'strong',
          },
          {
            type: 'textBody',
            style: 'plain',
            value: ' text',
          },
        ],
      },
      {
        type: 'paragraph',
        body: [
          {
            type: 'textBody',
            style: 'plain',
            value: 'Paragraph with ',
          },
          {
            type: 'textBody',
            style: 'italic',
            value: 'italic',
          },
          {
            type: 'textBody',
            style: 'plain',
            value: ' text',
          },
        ],
      },
    ];
    expect(parse(input)).toEqual(expected);
  });
});
