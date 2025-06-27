import React, { useState, useEffect, useCallback } from 'react';
import { Segmented, Card, Spin, Divider, Empty } from 'antd';
import { useTranslation } from '@/utils/i18n';
import { useKnowledgeApi } from '@/app/opspilot/api/knowledge';

interface ChunkDetailProps {
  chunkContent: string;
  chunkId?: string;
  indexName?: string;
  visible: boolean;
}

interface QAPair {
  id: string;
  question: string;
  answer: string;
}

const ChunkDetail: React.FC<ChunkDetailProps> = ({
  chunkContent,
  chunkId,
  indexName,
  visible
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>('chunk');
  const [qaPairs, setQaPairs] = useState<QAPair[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { fetchChunkQAPairs } = useKnowledgeApi();

  const fetchQAPairData = useCallback(async () => {
    if (!chunkId || !indexName) {
      console.log('Missing parameters:', { chunkId, indexName });
      setQaPairs([]);
      setLoading(false);
      return;
    }
    
    console.log('Fetching QA pairs with params:', { indexName, chunkId });
    setLoading(true);
    try {
      const data = await fetchChunkQAPairs(indexName, chunkId);
      setQaPairs(data);
    } catch (error) {
      console.error('获取问答对失败:', error);
      setQaPairs([]);
    } finally {
      setLoading(false);
    }
  }, [chunkId, indexName]);

  useEffect(() => {
    console.log('Effect triggered', { chunkId, indexName, activeTab, visible });
    if (visible && activeTab === 'qapairs' && chunkId && indexName) {
      fetchQAPairData();
    }
  }, [visible, activeTab, chunkId, indexName]);

  const segmentedOptions = [
    {
      value: 'chunk',
      label: t('knowledge.chunks'),
    },
    {
      value: 'qapairs',
      label: t('knowledge.qaPairs.title'),
    },
  ];

  const renderContent = () => {
    if (activeTab === 'chunk') {
      return (
        <div className="p-4">
          <div className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
            {chunkContent}
          </div>
        </div>
      );
    }

    if (activeTab === 'qapairs') {
      return (
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Spin size="large" />
            </div>
          ) : qaPairs.length > 0 ? (
            <div className="space-y-4">
              {qaPairs.map((qaPair) => (
                <Card
                  key={qaPair.id}
                  size="small"
                  className="bg-gray-50 border border-gray-200"
                >
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-2">
                        {t('knowledge.qaPairs.question')}
                      </div>
                      <div className="text-sm text-gray-800 leading-6">
                        {qaPair.question}
                      </div>
                    </div>
                    
                    <Divider className="my-3" />
                    
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-2">
                        {t('knowledge.qaPairs.answer')}
                      </div>
                      <div className="text-sm text-gray-800 leading-6">
                        {qaPair.answer}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Empty 
              description={t('knowledge.qaPairs.noData')}
              className="py-8"
            />
          )}
        </div>
      );
    }

    return null;
  };

  if (!visible) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <Segmented
          options={segmentedOptions}
          value={activeTab}
          onChange={setActiveTab}
        />
      </div>
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default ChunkDetail;