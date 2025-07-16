export interface KnowledgeValues {
  id: number,
  name: string;
  team: string[];
  introduction: string;
  embed_model: number;
  is_training?: boolean;
}

export interface Card {
  id: number;
  name: string;
  introduction: string;
  created_by: string;
  team_name?: string;
  team: string[];
  embed_model: number;
  permissions?: string[];
}

export interface ModifyKnowledgeModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (values: KnowledgeValues) => void;
  initialValues?: KnowledgeValues | null;
  isTraining?: boolean;
}

export interface PreviewData {
  id: number;
  content: string;
  characters: number;
}

export interface ModelOption {
  id: number;
  name: string;
  enabled: boolean;
}

export interface ConfigDataProps {
  selectedSearchTypes: string[];
  rerankModel: boolean;
  selectedRerankModel: string | null;
  textSearchWeight: number;
  vectorSearchWeight: number;
  textSearchMode: string;
  quantity: number;
  candidate: number;
  selectedEmbedModel: string | null;
  resultCount: number | null;
  rerankTopK: number;
  enableNaiveRag: boolean;
  enableQaRag: boolean;
  enableGraphRag: boolean;
  ragSize: number;
  qaSize: number;
  graphSize: number;
}

export interface TableData {
  id: string | number;
  name: string;
  chunk_size: number;
  created_by: string;
  created_at: string;
  train_status: number;
  train_status_display: string;
  [key: string]: any
}

export interface QAPairData {
  id: number;
  permissions: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  domain: string;
  updated_by_domain: string;
  name: string;
  description: string | null;
  qa_count: number;
  document_id: number;
  document_source: string;
  knowledge_base: number;
  llm_model: number;
}

// 知识图谱相关类型定义
export interface GraphNode {
  id: string;
  label: string;
  labels: string[];
  node_id?: number;
  group_id?: string;
  name?: string;
  uuid?: string;
  fact?: string | null;
  summary?: string | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: 'relation' | 'reference';
  relation_type?: string;
  source_name?: string;
  target_name?: string;
  source_id?: number;
  target_id?: number;
  fact?: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface KnowledgeGraphViewProps {
  data: GraphData;
  loading?: boolean;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  useMockData?: boolean;
}

// 测试相关类型定义
export interface QAPair {
  id: string;
  question: string;
  answer: string;
  score: number;
}

export interface GraphDataItem {
  name: string;
  uuid: number | string | undefined;
  group_id: string;
  node_id: number;
  edges: Array<{
    relation_type: string;
    source: string;
    target: string;
    source_name: string;
    target_name: string;
    source_id: number;
    target_id: number;
  }>;
}

export interface TestKnowledgeResponse {
  docs: any[]; // 可以根据实际的ResultItem类型进行更具体的定义
  qa_docs: QAPair[];
  graph_data: GraphDataItem[];
}

// 配置组件相关类型定义
export interface ConfigProps {
  configData: ConfigDataProps;
  setConfigData: React.Dispatch<React.SetStateAction<ConfigDataProps>>;
}
