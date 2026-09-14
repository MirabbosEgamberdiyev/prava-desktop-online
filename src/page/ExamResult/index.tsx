import { ExamResultPage } from "../../features/ExamResult";
import SEO from "../../components/common/SEO";

const ExamResult_Page = () => {
  return (
    <>
      <SEO
        title="Imtihon natijasi"
        description="Imtihon natijalaringizni batafsil ko'ring va xatolaringizni tahlil qiling."
        noIndex={true}
      />

      <ExamResultPage />
    </>
  );
};

export default ExamResult_Page;
