export type NavItem = {
  name: string;
  href: string;
};

export const allDocsPages: NavItem[] = [
  { name: "Getting Started", href: "/docs/getting-started" },
  { name: "Core API", href: "/docs/core" },
  { name: "React Components", href: "/docs/react" },
  { name: "Changelog", href: "/docs/changelog" },
];
