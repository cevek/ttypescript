import * as ts from 'typescript';
import { PluginCreator, PluginConfig } from '../PluginCreator';
import * as path from 'path';

export function createTransformers(config: PluginConfig[]): ts.CustomTransformers {
    const pluginCreator = new PluginCreator(config, __dirname);
    const host = { program: {} as ts.Program };
    return pluginCreator.createTransformers(host);
}
