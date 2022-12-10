// A type level "mock" of real vitest.
// vitest imports a lot of third party types that are irrelevant for this project.
// That's an extra work for TypeScript and it becomes a noise when one wants to measure
// how fast the library compiles.

export * from 'vitest';
