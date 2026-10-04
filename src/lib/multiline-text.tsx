export const renderMultilineText = (text: string) => {
  let offset = 0;

  return text.split("\n").map((line) => {
    const key = `${offset}-${line}`;
    const shouldInsertBreak = offset > 0;
    offset += line.length + 1;

    return (
      <span key={key}>
        {shouldInsertBreak && <br />}
        {line}
      </span>
    );
  });
};
