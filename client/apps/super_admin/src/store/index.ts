
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import appearanceReducer from './slices/appearanceSlice';
// Import from services/index to ensure endpoints are registered
import { api } from '../services';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        appearance: appearanceReducer,
        [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

