import { PluginCreator, PluginConfig } from '../PluginCreator';
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
            afterDeclaration: [],
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
            afterDeclaration: [],
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
            afterDeclaration: [],
            before: [],
        });
    });
});
