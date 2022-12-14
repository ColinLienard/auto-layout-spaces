import { getRandomColor, rgba } from './helpers';
import { Spacings, UIMessage, Unit } from './types';

figma.showUI(__html__, { width: 300, height: 410, themeColors: true });

const layerName = '< 👀 Auto-layout Spaces >';
let GROUP_ID: string;
let UNIT: Unit = 'px';
let SPACINGS: Spacings = 'all';
let HIDE_ON_EXIT = true;

const getValueInUnit = (value: number): string => {
  switch (UNIT) {
    case 'px':
      return `${value}px`;
    case 'rem':
      return `${value / 16}rem`;
    default:
      return `${value / UNIT}`;
  }
};

// Create a frame with a text in it
const createVisualSpace = (
  x: number,
  y: number,
  width: number,
  height: number,
  value: number
): FrameNode => {
  const frame = figma.createFrame();

  const color = getRandomColor(value);

  // Set parameters
  frame.x = x;
  frame.y = y;
  frame.layoutMode = 'HORIZONTAL';
  frame.primaryAxisAlignItems = 'CENTER';
  frame.counterAxisAlignItems = 'CENTER';
  frame.clipsContent = false;
  frame.fills = rgba(...color, 0.25);
  frame.expanded = false;

  // Create a text centered in the frame
  const text = figma.createText();
  text.characters = getValueInUnit(value);
  let fontSize = value * 0.8;
  if (fontSize > 32) {
    fontSize = 32;
  } else if (fontSize < 12) {
    fontSize = 12;
  }
  text.fontSize = fontSize;
  text.fills = rgba(1, 1, 1);
  text.strokes = rgba(0, 0, 0, 0.5);
  frame.appendChild(text);

  // Set the size after appending the text
  frame.resize(width, height);

  return frame;
};

const showVisualSpaces = async () => {
  // Load a font to display text
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

  // Get all frames with auto-layouts
  const nodes = figma.currentPage.findAll(
    (node) =>
      (node.type === 'FRAME' || node.type === 'INSTANCE') &&
      node.layoutMode !== 'NONE' &&
      node.visible
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
    if (SPACINGS !== 'paddings' && children.length > 1) {
      children.forEach((child, index) => {
        // Do not add a visual space for the last child
        if (index === children.length - 1 || itemSpacing <= 0) {
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
              itemSpacing
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
            itemSpacing
          )
        );
      });
    }

    if (SPACINGS === 'spacing-between-items') {
      return;
    }

    // Create visual spaces for paddings
    if (paddingTop) {
      allVisualSpaces.push(
        createVisualSpace(x, y, width, paddingTop, paddingTop)
      );
    }
    if (paddingRight) {
      allVisualSpaces.push(
        createVisualSpace(
          x + width - paddingRight,
          y,
          paddingRight,
          height,
          paddingRight
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
          paddingBottom
        )
      );
    }
    if (paddingLeft) {
      allVisualSpaces.push(
        createVisualSpace(x, y, paddingLeft, height, paddingLeft)
      );
    }
  });

  // Notify that no spacings can be showned
  if (allVisualSpaces.length === 0) {
    figma.notify('No space to display.');
    return;
  }

  // Put all visual spaces in a group
  const group = figma.group(allVisualSpaces, figma.currentPage);
  group.expanded = false;
  group.locked = true;
  group.name = layerName;
  GROUP_ID = group.id;
};

const hideVisualSpaces = () => {
  const group = figma.currentPage.findChild((node) => node.id === GROUP_ID);
  group?.remove();
};

// Handle events from the ui
figma.ui.onmessage = async (message: UIMessage) => {
  switch (message.type) {
    case 'show':
      showVisualSpaces();
      break;
    case 'hide':
      hideVisualSpaces();
      break;
    case 'unit':
      UNIT = message.value as Unit;
      break;
    case 'spacings':
      SPACINGS = message.value as Spacings;
      break;
    case 'hide-on-exit':
      HIDE_ON_EXIT = message.value as boolean;
      break;
    default:
      throw new Error();
  }
};

// Hide visual spaces when closing the plugin
figma.on('close', () => {
  if (HIDE_ON_EXIT) {
    hideVisualSpaces();
  }
});

// Delete already existing visual spaces
figma.currentPage
  .findChildren((node) => node.name === layerName)
  .forEach((node) => node.remove());
