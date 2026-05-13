import Link from "next/link";

const NotFoundPage = () => {
  return (
    <div className="container mx-auto flex flex-1 flex-col items-center justify-center py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">Tätä sivua ei löytynyt.</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Palaa etusivulle
      </Link>
    </div>
  );
};

export default NotFoundPage;
