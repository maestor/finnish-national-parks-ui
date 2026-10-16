import { buildParkMetadata, ParkDetailPage } from "@/components/park/park-detail-page";

export const generateStaticParams = () => [];

type Props = { params: Promise<{ slug: string }> };

export const generateMetadata = ({ params }: Props) => buildParkMetadata({ params });

const PublicParkPage = ({ params }: Props) => ParkDetailPage({ params });
export default PublicParkPage;
