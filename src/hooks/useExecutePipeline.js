import { useCallback } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { runPipeline, runSingleNode } from '../engine/runner';

export function useExecutePipeline() {
  const {
    nodes, edges,
    nodeSettings, nodeOutputs,
    setNodeStatus, setNodeOutput,
  } = useFlowStore();

  const execute = useCallback(async () => {
    try {
      await runPipeline({
        nodes,
        edges,
        nodeSettings,
        nodeOutputs,
        onNodeStart: (id) => {
          useFlowStore.getState().setNodeStatus(id, 'loading');
        },
        onNodeDone: (id, output) => {
          useFlowStore.getState().setNodeOutput(id, output);
          useFlowStore.getState().setNodeStatus(id, 'success');
        },
        onNodeError: (id, err) => {
          useFlowStore.getState().setNodeStatus(id, 'error', err);
        },
      });
    } catch (err) {
      console.error('[Pipeline]', err.message);
      alert(`Pipeline error: ${err.message}`);
    }
  }, [nodes, edges, nodeSettings, nodeOutputs]);

  const executeSingle = useCallback(async (nodeId) => {
    await runSingleNode({
      nodeId,
      nodes,
      edges,
      nodeSettings,
      nodeOutputs,
      onNodeStart: (id) => useFlowStore.getState().setNodeStatus(id, 'loading'),
      onNodeDone: (id, output) => {
        useFlowStore.getState().setNodeOutput(id, output);
        useFlowStore.getState().setNodeStatus(id, 'success');
      },
      onNodeError: (id, err) => useFlowStore.getState().setNodeStatus(id, 'error', err),
    });
  }, [nodes, edges, nodeSettings, nodeOutputs]);

  return { execute, executeSingle };
}
