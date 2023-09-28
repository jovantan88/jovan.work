import Typewriter from "typewriter-effect";

function Start() {
  return (
    <>
      <div className="home">
        <div className="bg fluid"></div>
        <div className="textdiv position-absolute top-50 start-50 translate-middle">
          <h1 className="align-middle text-center mono">
            <p className="text-light">
              <Typewriter
                onInit={(typewriter) => {
                  typewriter
                    .typeString("Jovan.work")
                    .pauseFor(1500)
                    .deleteChars(5)
                    .typeString("'s Portfolio")
                    .start();
                }}
              />
            </p>
          </h1>
          <h2 className="fs-5 text-light align-middle text-center focus-in-expand share mono">
            Student | Programmer | Freelancer
          </h2>
        </div>
        <div className="">
          <div id="section01" className="scroll">
            <a
              href="#02"
              className="position-absolute start-50 translate-middle-x"
            >
              <span></span>Scroll
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

export default Start;
