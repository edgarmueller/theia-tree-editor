import { getSchema, getUiSchema } from '@jsonforms/core';
export * from './theia-tree-editor-open-handler';


export interface TreeEditorAppProps {
  uischema: any;
  schema: any;
  filterPredicate: any;
  labelProvider: any;
  imageProvider: any;
  saveable: any;
}


export const mapStateToTreeEditorAppProps = (state, ownProps) => {
  return {
    uischema: getUiSchema(state),
    schema: getSchema(state),
    filterPredicate: ownProps.filterPredicate,
    labelProvider: ownProps.labelProvider,
    imageProvider: ownProps.imageProvider
  };
};

export * from './tree-editor-utils'