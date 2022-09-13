// A type level "mock" of real vitest.
// vitest imports a lot of third party types that are irrelevant for this project.
// That's an extra work for TypeScript and it becomes a noise when one wants to measure
// how fast the library compiles.

type SuiteFactory = (test: (name: string, fn: TestFunction) => void) => Awaitable<void>;
type TestFunction<> = () => Awaitable<any> | void;

export declare const describe: (name: string, factory: SuiteFactory) => void;
export declare const it: (name: string, fn?: TestFunction, timeout?: number) => void;
export declare const test = it;
export declare const expect: any;
