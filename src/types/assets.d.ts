/**
 * TypeScript 6 requires a declaration for side-effect imports (TS2882).
 * Next handles the bundling; this just tells the type-checker the import
 * is legitimate and carries no exports.
 */
declare module '*.css';
