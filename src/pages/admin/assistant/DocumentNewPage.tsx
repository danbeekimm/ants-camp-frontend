import { useNavigate } from 'react-router-dom'
import { createDocument, type SaveDocumentRequest } from '@/services/assistantApi'
import { DocumentForm } from './DocumentForm'
import { AdminBackHeader } from '@/components/admin'

export function DocumentNewPage() {
  const navigate = useNavigate()

  const handleSubmit = async (data: SaveDocumentRequest) => {
    const res = await createDocument(data)
    // 상세 페이지에서 폴링 → COMPLETED 되면 목록으로 자동 이동
    navigate(`/admin/assistant/documents/${res.documentId}`, { replace: true })
  }

  return (
    <div className="pb-10">
      <AdminBackHeader
        back="/admin/assistant/documents"
        kicker="Assistant · Document"
        title="새 문서 등록"
        subtitle="등록된 문서는 자동으로 인덱싱되어 어시스턴트의 답변에 활용됩니다."
      />
      <DocumentForm onSubmit={handleSubmit} submitLabel="등록하기" />
    </div>
  )
}
