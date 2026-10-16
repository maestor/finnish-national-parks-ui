import { buildParkMetadata, ParkDetailPage } from "@/components/park/park-detail-page";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export const generateMetadata = async ({ params }: Props) => {
  const metadata = await buildParkMetadata({ params, authenticated: true });
  return { ...metadata, robots: { index: false, follow: false } };
};

const AuthenticatedParkPage = ({ params }: Props) =>
  ParkDetailPage({ params, authenticated: true });
export default AuthenticatedParkPage;
