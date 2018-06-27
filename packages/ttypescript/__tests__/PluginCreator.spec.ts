import { PluginConfig, PluginCreator } from 'ttypescript/lib/PluginCreator';
import { createTransformers } from './helpers';
import { advancedTransformer } from './transforms/transform-advanced';
import { simpleTransformer } from './transforms/transform-simple';
import * as ts from 'typescript';

describe('PluginCreator', () => {
    it('should be initialized with empty config', () => {
        const pluginCreator = new PluginCreator(ts, []);

        expect(pluginCreator).toBeInstanceOf(PluginCreator);
    });

    it('should throw error if wrong config entry given', () => {
        const config = [
            {
                someGarbage: 123,
            },
        ] as any;

        expect(() => new PluginCreator(ts, config)).toThrow();
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
        const config: PluginConfig[] = [{ transform: './transforms/transform-advanced.ts', some: 1, bla: 2 } as any];

        expect(createTransformers(config)).toEqual({
            after: [advancedTransformer],
            afterDeclarations: [],
            before: [],
        });
    });
});
