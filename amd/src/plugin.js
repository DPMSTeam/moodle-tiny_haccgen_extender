import {getTinyMCE} from 'editor_tiny/loader';
import {getPluginMetadata} from 'editor_tiny/utils';
import {component, pluginName} from './common';
import {register as registerOptions} from './options';
import {getSetup as getCommandSetup} from './commands';
import * as Configuration from './configuration';

export default new Promise((resolve, reject) => {
    (async () => {
        try {
            const [
                tinyMCE,
                pluginMetadata,
                setupCommands,
            ] = await Promise.all([
                getTinyMCE(),
                getPluginMetadata(component, pluginName),
                getCommandSetup(),
            ]);

            tinyMCE.PluginManager.add(pluginName, (editor) => {
                registerOptions(editor);
                setupCommands(editor);
                return pluginMetadata;
            });

            resolve([pluginName, Configuration]);
        } catch (e) {
            reject(e);
        }
    })();
});
