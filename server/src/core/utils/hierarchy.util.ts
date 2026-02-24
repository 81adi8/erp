/**
 * Utility for building hierarchical structures from flat arrays
 */

export interface HierarchicalItem {
    id: string;
    parent_id?: string | null;
}

/**
 * Recursive type for hierarchical structures
 */
export type Nested<T> = T & { children?: Nested<T>[] };

/**
 * Nests a flat array of items into a tree structure based on parent_id
 * @param items Flat array of items
 * @param sortField Field to sort by at each level
 */
export function nestItems<T extends HierarchicalItem>(
    items: T[],
    sortField: keyof T | string = 'sort_order'
): Nested<T>[] {
    const itemMap = new Map<string, Nested<T>>();
    const rootItems: Nested<T>[] = [];

    // Map items and initialize children
    items.forEach(item => {
        itemMap.set(item.id, { ...item, children: [] });
    });

    // Build hierarchy
    itemMap.forEach(item => {
        if (item.parent_id && itemMap.has(item.parent_id)) {
            const parent = itemMap.get(item.parent_id)!;
            parent.children = parent.children || [];
            parent.children.push(item);
        } else {
            rootItems.push(item);
        }
    });

    // Recursive sorting
    const sortRecursive = (node: Nested<T>) => {
        if (node.children && node.children.length > 0) {
            node.children.sort((a, b) => {
                const valA = (a as any)[sortField] || 0;
                const valB = (b as any)[sortField] || 0;
                return valA - valB;
            });
            node.children.forEach(sortRecursive);
        }
    };

    rootItems.sort((a, b) => {
        const valA = (a as any)[sortField] || 0;
        const valB = (b as any)[sortField] || 0;
        return valA - valB;
    });

    rootItems.forEach(sortRecursive);

    return rootItems;
}
