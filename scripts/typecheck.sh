echo "Running tests with TypeScript 4.4..." && time node_modules/ts4.4/bin/tsc -p tsconfig.test.json --noemit && \
echo "Running tests with TypeScript 4.5..." && time node_modules/ts4.5/bin/tsc -p tsconfig.test.json --noemit && \
echo "Running tests with TypeScript 4.6..." && time node_modules/ts4.6/bin/tsc -p tsconfig.test.json --noemit && \
echo "Running tests with TypeScript 4.7..." && time node_modules/ts4.7/bin/tsc -p tsconfig.test.json --noemit && \
echo "Running tests with TypeScript 4.8..." && time node_modules/ts4.8/bin/tsc -p tsconfig.test.json --noemit && \
echo "Running tests with TypeScript 4.9..." && time node_modules/ts4.9/bin/tsc -p tsconfig.test.json --noemit && \
echo "Running tests with TypeScript 5.0..." && time node_modules/ts5.0/bin/tsc -p tsconfig.test.json --noemit && \
echo "Running tests with TypeScript 5.1..." && time node_modules/ts5.1/bin/tsc -p tsconfig.test.json --noemit && \
echo "Running tests with TypeScript 5.2..." && time node_modules/ts5.2/bin/tsc -p tsconfig.test.json --noemit && \
echo "Running tests with TypeScript 5.3..." && time node_modules/ts5.3/bin/tsc -p tsconfig.test.json --noemit && \
echo "Running tests with TypeScript 5.4..." && time node_modules/ts5.4/bin/tsc -p tsconfig.test.json --noemit && \
echo "Running tests with TypeScript 5.5..." && time node_modules/ts5.5/bin/tsc -p tsconfig.test.json --noemit && \
echo "Running tests with TypeScript 5.6..." && time node_modules/ts5.6/bin/tsc -p tsconfig.test.json --noemit && \
echo "Running tests with TypeScript 5.7..." && time node_modules/ts5.7/bin/tsc -p tsconfig.test.json --noemit && \
echo "Running tests with TypeScript 5.8..." && time node_modules/ts5.8/bin/tsc -p tsconfig.test.json --noemit && \
echo "Running tests with TypeScript Native Preview..." && time node_modules/@typescript/native-preview/bin/tsgo.js -p tsconfig.test.json --noemit && \
echo "Done"
