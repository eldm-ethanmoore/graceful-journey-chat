declare module 'react-markdown' {
  import { ComponentType, ReactNode } from 'react';
  
  interface ReactMarkdownProps {
    children?: string;
    components?: {
      [nodeType: string]: ComponentType<any>;
    };
    remarkPlugins?: any[];
    rehypePlugins?: any[];
  }
  
  const ReactMarkdown: ComponentType<ReactMarkdownProps>;
  export default ReactMarkdown;
}
