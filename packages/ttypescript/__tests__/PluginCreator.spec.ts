import { PluginCreator, PluginConfig } from 'ttypescript/lib/PluginCreator';
import { simpleTransformer } from './transforms/transform-simple';
import { advancedTransformer } from './transforms/transform-advanced';
import { createTransformers } from './helpers';

describe('PluginCreator', () => {
    it('should be initialized with empty config', () => {
        const pluginCreator = new PluginCreator([]);

        expect(pluginCreator).toBeInstanceOf(PluginCreator);
    });

    it('should throw error if wrong config entry given', () => {
        const config = [
            {
                someGarbage: 123,
            },
        ] as any;

        expect(() => new PluginCreator(config)).toThrow();
    });

    it('should initialize default transformer in before group', () => {
        const config: PluginConfig[] = [
            {
                transform: './transforms/transform-simple.ts',
            },
        ];

        expect(createTransformers(config)).toEqual({
            after: [],
            afterDeclarations: [],
            before: [simpleTransformer],
        });
    });

    it('should initialize default transformer in after group', () => {
        const config: PluginConfig[] = [
            {
                transform: './transforms/transform-simple.ts',
                after: true,
            },
        ];

        expect(createTransformers(config)).toEqual({
            after: [simpleTransformer],
            afterDeclarations: [],
            before: [],
        });
    });

    it('should initialize advanced transformer in after group', () => {
        const config: PluginConfig[] = [
            {
                transform: './transforms/transform-advanced.ts',
            },
        ];

        expect(createTransformers(config)).toEqual({
            after: [advancedTransformer],
            afterDeclarations: [],
            before: [],
        });
    });
    it('should provide custom config', () => {
        const config: PluginConfig[] = [{ transform: './transforms/transform-advanced.ts', some: 1, bla: 2 }];

        expect(createTransformers(config)).toEqual({
            after: [advancedTransformer],
            afterDeclarations: [],
            before: [],
        });
    });
});
