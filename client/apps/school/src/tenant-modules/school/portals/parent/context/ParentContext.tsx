/**
 * Parent Context
 * Manages selected child state for multi-child support
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useGetLinkedChildrenQuery } from '../../../api/parentPortalApi';
import type { LinkedChild } from '../../../api/parentPortalApi';

interface ParentContextType {
    children: LinkedChild[];
    selectedChild: LinkedChild | null;
    setSelectedChild: (child: LinkedChild | null) => void;
    isLoading: boolean;
    isError: boolean;
    hasChildren: boolean;
}

const ParentContext = createContext<ParentContextType | undefined>(undefined);

export function ParentProvider({ children }: { children: ReactNode }) {
    const { data, isLoading, isError } = useGetLinkedChildrenQuery();
    const [selectedChild, setSelectedChild] = useState<LinkedChild | null>(null);

    const linkedChildren = data?.data || [];

    // Auto-select primary child or first child
    useEffect(() => {
        if (linkedChildren.length > 0 && !selectedChild) {
            const primaryChild = linkedChildren.find(c => c.is_primary);
            setSelectedChild(primaryChild || linkedChildren[0]);
        }
    }, [linkedChildren, selectedChild]);

    const value: ParentContextType = {
        children: linkedChildren,
        selectedChild,
        setSelectedChild,
        isLoading,
        isError,
        hasChildren: linkedChildren.length > 0,
    };

    return (
        <ParentContext.Provider value={value}>
            {children}
        </ParentContext.Provider>
    );
}

export function useParent() {
    const context = useContext(ParentContext);
    if (context === undefined) {
        throw new Error('useParent must be used within a ParentProvider');
    }
    return context;
}
