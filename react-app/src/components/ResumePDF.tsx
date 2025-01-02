// src/components/ResumePDF.js
import styled from 'styled-components';

const PDFContainer = styled.div`
  width: 100%;
  height: 100vh; /* Full viewport height */
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #000; /* Optional: Match your app's background */

  object {
    width: 80%;
    height: 90%;
    border: none;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    border-radius: 8px;
  }

  @media (max-width: 768px) {
    object {
      width: 95%;
      height: 80%;
    }
  }

  p {
    color: #fff;
    text-align: center;
    font-size: 1.2rem;
  }

  a {
    color: #1e90ff;
    text-decoration: underline;
  }
`;

function ResumePDF() {
  return (
    <PDFContainer>
      <object data="/CV.pdf" type="application/pdf">
        <p>
          It appears you don't have a PDF plugin for this browser. No big
          deal... you can{' '}
          <a href="/CV.pdf" target="_blank" rel="noopener noreferrer">
            click here to download the PDF
          </a>.
        </p>
      </object>
    </PDFContainer>
  );
}

export default ResumePDF;
