import { useRef, useEffect } from "react";
import CloudPdfViewer from "@cloudpdf/viewer";

function ResumePDF() {
  const viewer = useRef(null);
  useEffect(() => {
    CloudPdfViewer(
      {
        documentId: "32c3d437-2e13-48f0-bd64-f1cb95f35df7",
        darkMode: true
      },
      viewer.current!
    ).then((instance) => { console.log(instance) });
  }, []);
  return (
    <>
      <div className="app">
        <div className="viewer mx-auto" ref={viewer}></div>
      </div>
    </>
  );
}

export default ResumePDF;