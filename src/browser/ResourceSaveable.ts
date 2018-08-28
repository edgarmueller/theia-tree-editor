import {
  Disposable,
  Event,
  MaybePromise,
  MessageService,
  Resource
} from '@theia/core/lib/common';
import {Saveable, WidgetManager} from "@theia/core/lib/browser";
import { DIRTY_CLASS, TreeEditorWidget } from './theia-tree-editor-widget';
import * as _ from 'lodash';
import { unmanaged } from 'inversify';

export class ResourceSaveable implements Saveable {
  autoSave;
  dirty: boolean = false;
  onDirtyChanged: Event<void> = Object.assign((listener: (e) => any) => {
      let result: Disposable;
      result = {
        dispose: () => {}
      };

      return result;
    }, {
      maxListeners: 30
    }
  );

  constructor(private resource: Resource,
              private getData: () => any,
              @unmanaged() private readonly widgetManager: WidgetManager,
              @unmanaged() private readonly messageService: MessageService) {}

  save(): MaybePromise<void> {
    return this.onSave(this.getData()).then(this.doSave)
  }

  doSave = (content: string): MaybePromise<void> => {
    if ( this.resource !== undefined && this.resource.saveContents !== undefined ) {
      return this.resource.saveContents(content, { encoding: 'UTF-8' })
        .then(() => {
          this.dirty = false;
          const widget = _.head(this.widgetManager.getWidgets('theia-tree-editor')) as TreeEditorWidget;
          const dirtyClass = ` ${DIRTY_CLASS}`;
          widget.title.className = widget.title.className.replace(dirtyClass, '');
      });
    } else {
      this.messageService.error('Save Error: Undefined Resource');
      return undefined;
    }
  }

  onSave(data: any): Promise<string> {
    const content = JSON.stringify(data, null, 2);
    return Promise.resolve(content);
  }
}
