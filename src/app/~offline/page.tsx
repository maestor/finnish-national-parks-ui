const OfflinePage = () => {
  return (
    <div className="container mx-auto flex flex-1 flex-col items-center justify-center py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Olet offline-tilassa</h1>
      <p className="mt-4 text-muted-foreground">
        Sivu ei ole saatavilla ilman internetyhteyttä. Tarkista yhteytesi ja yritä uudelleen.
      </p>
    </div>
  );
};

export default OfflinePage;
