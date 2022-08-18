import { rgba } from './helpers';

figma.showUI(__html__);

// Create a frame with a text in it
const createVisualSpace = (
  x: number,
  y: number,
  width: number,
  height: number,
  unit: number,
  color: [number, number, number]
): FrameNode => {
  const frame = figma.createFrame();

  // Set parameters
  frame.x = x;
  frame.y = y;
  frame.layoutMode = 'HORIZONTAL';
  frame.primaryAxisAlignItems = 'CENTER';
  frame.counterAxisAlignItems = 'CENTER';
  frame.clipsContent = false;
  frame.fills = rgba(...color, 0.2);
  frame.expanded = false;

  // Create a text centered in the frame
  const text = figma.createText();
  text.characters = `${unit}px`;
  text.fills = rgba(...color);
  text.strokes = rgba(1, 1, 1);
  frame.appendChild(text);

  // Set the size after appending the text
  frame.resize(width, height);

  return frame;
};

figma.ui.onmessage = async () => {
  // Load a font to display text
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

  // Get all frames with auto-layouts
  const nodes = figma.currentPage.findAll(
    (node) => node.type === 'FRAME' && node.layoutMode !== 'NONE'
  ) as FrameNode[];

  // This array will store all of the visual spaces
  const allVisualSpaces: FrameNode[] = [];

  // For each node, create visual space for each padding
  nodes.forEach((node) => {
    const {
      absoluteTransform,
      width,
      height,
      children,
      itemSpacing,
      paddingBottom,
      paddingLeft,
      paddingRight,
      paddingTop,
    } = node;
    const x = absoluteTransform[0][2];
    const y = absoluteTransform[1][2];

    // Create visual spaces for each space between children
    if (children.length > 1) {
      children.forEach((child, index) => {
        // Do not add a visual space fot the last child
        if (index === children.length - 1 || itemSpacing < 0) {
          return;
        }

        // Vertical spaces
        if (node.layoutMode === 'VERTICAL') {
          allVisualSpaces.push(
            createVisualSpace(
              x + paddingLeft,
              y + child.y + child.height,
              width - paddingLeft - paddingRight,
              itemSpacing,
              itemSpacing,
              [0, 0, 1]
            )
          );
          return;
        }

        // Horizontal spaces
        allVisualSpaces.push(
          createVisualSpace(
            x + child.x + child.width,
            y + paddingTop,
            itemSpacing,
            height - paddingTop - paddingBottom,
            itemSpacing,
            [0, 0, 1]
          )
        );
      });
    }

    // Create visual spaces for paddings
    if (paddingTop) {
      allVisualSpaces.push(
        createVisualSpace(x, y, width, paddingTop, paddingTop, [1, 0, 0])
      );
    }
    if (paddingRight) {
      allVisualSpaces.push(
        createVisualSpace(
          x + width - paddingRight,
          y,
          paddingRight,
          height,
          paddingRight,
          [1, 0, 0]
        )
      );
    }
    if (paddingBottom) {
      allVisualSpaces.push(
        createVisualSpace(
          x,
          y + height - paddingBottom,
          width,
          paddingBottom,
          paddingBottom,
          [1, 0, 0]
        )
      );
    }
    if (paddingLeft) {
      allVisualSpaces.push(
        createVisualSpace(x, y, paddingLeft, height, paddingLeft, [1, 0, 0])
      );
    }
  });

  // Put all visual spaces in a group
  const group = figma.group(allVisualSpaces, figma.currentPage);
  group.expanded = false;
  group.locked = true;
  group.name = '< 👀 Auto-layout Spaces >';
};
