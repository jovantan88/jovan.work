import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope } from '@fortawesome/free-solid-svg-icons'

import EmailForm from './EmailForm.tsx';

function Email() {
  const popover = (
    <Popover id="popover-basic">
      <Popover.Header as="h3">Contact me!</Popover.Header>
      <Popover.Body>
        <EmailForm />
      </Popover.Body>
    </Popover>
  );
  return (
    <>
      <div className="overlay">
        <OverlayTrigger trigger="click" placement="left" overlay={popover}>
          <FontAwesomeIcon icon={faEnvelope} className="display-5 EmailButton" />
        </OverlayTrigger>
      </div>
    </>
  );
}
export default Email;
