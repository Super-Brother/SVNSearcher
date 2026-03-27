import { create } from 'zustand'

interface TreeNode {
  key: string
  title: string
  isLeaf: boolean
  children?: TreeNode[]
}

interface SvnState {
  currentPath: string
  treeData: TreeNode[]
  selectedNode: string | null
  expandedKeys: string[]
  loading: boolean
  setTreeData: (data: TreeNode[]) => void
  setCurrentPath: (path: string) => void
  setSelectedNode: (key: string | null) => void
  setExpandedKeys: (keys: string[]) => void
  setLoading: (loading: boolean) => void
  addChildren: (parentKey: string, children: TreeNode[]) => void
}

export const useSvnStore = create<SvnState>((set) => ({
  currentPath: '',
  treeData: [],
  selectedNode: null,
  expandedKeys: [],
  loading: false,

  setTreeData: (data) => set({ treeData: data }),
  setCurrentPath: (path) => set({ currentPath: path }),
  setSelectedNode: (key) => set({ selectedNode: key }),
  setExpandedKeys: (keys) => set({ expandedKeys: keys }),
  setLoading: (loading) => set({ loading }),

  addChildren: (parentKey, children) =>
    set((state) => {
      const updateNode = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map((node) => {
          if (node.key === parentKey) {
            return { ...node, children }
          }
          if (node.children) {
            return { ...node, children: updateNode(node.children) }
          }
          return node
        })
      }
      return { treeData: updateNode(state.treeData) }
    })
}))