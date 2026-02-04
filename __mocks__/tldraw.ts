// Mock tldraw for testing
export const createShapeId = (id: string) => id as any;

export const Tldraw = () => null;
export const Editor = jest.fn();

export const DefaultColorThemePalette = {
  lightMode: {
    orange: {
      solid: '#F2BED1',
      semi: '#F2BED1'
    }
  },
  darkMode: {
    orange: {
      solid: '#F2BED1',
      semi: '#F2BED1'
    }
  }
};

export const DefaultToolbar = ({ children }: any) => null;
export const SelectToolbarItem = () => null;
export const HandToolbarItem = () => null;
