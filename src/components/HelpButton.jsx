import React from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons';

const HelpButton = ({ titulo, bullets }) => {
    const handleClick = () => {
        Swal.fire({
            title: titulo,
            html: `<ul style="text-align:left;padding-left:1.2em;margin:0;line-height:2;color:#475569">
                ${bullets.map(b => `<li>${b}</li>`).join('')}
            </ul>`,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#5dc87a',
            width: '500px',
        });
    };

    return (
        <button
            onClick={handleClick}
            title="Ayuda"
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#5dc87a',
                fontSize: '20px',
                padding: '2px 4px',
                display: 'inline-flex',
                alignItems: 'center',
                opacity: 0.7,
                transition: 'opacity 0.15s',
                lineHeight: 1,
                flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
        >
            <FontAwesomeIcon icon={faCircleQuestion} />
        </button>
    );
};

export default HelpButton;
