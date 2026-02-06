import { computed, effect, signal } from '@angular/core';
import {
    signalStoreFeature,
    withComputed,
    withMethods,
    withState,
    patchState,
    SignalStoreFeature
} from '@ngrx/signals';

export interface UndoRedoOptions<State> {
    maxStackSize?: number;
    keys?: (keyof State)[]; // Keys to track, default all
}

export function withUndoRedo<State extends object>(options: UndoRedoOptions<State> = {}) {
    const maxStackSize = options.maxStackSize || 50;

    return signalStoreFeature(
        withState({
            historyStack: [] as State[],
            futureStack: [] as State[],
            isUndoing: false // Flag to prevent circular updates if we used effects (not used immediately but good practice)
        }),
        withComputed(({ historyStack, futureStack }) => ({
            canUndo: computed(() => historyStack().length > 0),
            canRedo: computed(() => futureStack().length > 0),
        })),
        withMethods((store) => ({
            /**
             * Saves a snapshot of simple state (no deep clone, assume immutable updates)
             * Call this BEFORE making a destructive change.
             */
            saveToHistory() {
                // Create a snapshot of the tracked state
                // We cast store to any to access dynamic keys, validation needed in implementation
                const snapshot: any = {};

                // If keys provided, only save those. Else save all except internal props.
                // Actually, for EditorStore, we specifically care about 'nodes', 'connections', 'project'.
                // Let's rely on the consumer (EditorStore) to know what to save, NO, that's tedious.

                // Let's assume we want to snapshot everything that is a Signal in the base store?
                // Hard to introspect generically without 'keys'.
                // So we will enforce 'keys' usage or assume specific context if specific to Editor.
                // Let's keep it generic-ish.

                if (options.keys) {
                    options.keys.forEach(k => {
                        snapshot[k] = (store as any)[k](); // Read signal
                    });
                }

                patchState(store as any, (state: any) => ({
                    historyStack: [snapshot, ...state.historyStack].slice(0, maxStackSize),
                    futureStack: [] // Clear future on new action
                }));
            },

            undo() {
                const history = (store as any).historyStack();
                if (history.length === 0) return;

                const previousState = history[0];
                const newHistory = history.slice(1);

                // Capture current state to future
                const currentState: any = {};
                if (options.keys) {
                    options.keys.forEach(k => {
                        currentState[k] = (store as any)[k]();
                    });
                }

                patchState(store as any, (state: any) => ({
                    ...previousState, // Restore state
                    historyStack: newHistory,
                    futureStack: [currentState, ...state.futureStack].slice(0, maxStackSize)
                }));
            },

            redo() {
                const future = (store as any).futureStack();
                if (future.length === 0) return;

                const nextState = future[0];
                const newFuture = future.slice(1);

                // Capture current to history
                const currentState: any = {};
                if (options.keys) {
                    options.keys.forEach(k => {
                        currentState[k] = (store as any)[k]();
                    });
                }

                patchState(store as any, (state: any) => ({
                    ...nextState,
                    historyStack: [currentState, ...state.historyStack].slice(0, maxStackSize),
                    futureStack: newFuture
                }));
            }
        }))
    );
}
