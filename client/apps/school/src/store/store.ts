import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { baseApi } from '../core/api/baseApi';
import appearanceReducer from './slices/appearanceSlice';
import sessionReducer from './slices/sessionSlice';

// Configure store with RTK Query middleware
export const store = configureStore({
    reducer: {
        [baseApi.reducerPath]: baseApi.reducer,
        appearance: appearanceReducer,
        session: sessionReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types for serializable check
                ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
            },
        }).concat(baseApi.middleware),
    devTools: import.meta.env.DEV,
});

// Infer types from store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks for use throughout the app (react-redux 9.x compatible)
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

