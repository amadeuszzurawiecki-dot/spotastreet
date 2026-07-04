import './BackgroundLines.css';

const LINE_COUNT = 9;

function BackgroundLines() {
  return (
    <div className="background-lines" aria-hidden="true">
      {Array.from({ length: LINE_COUNT }, (_, index) => (
        <div className="background-lines__line" key={index} />
      ))}
    </div>
  );
}

export default BackgroundLines;
