import './BotonIngresar.css';

function BotonIngresar({ bloqueado = false }) {
    return (
        <button
            type='submit'
            className={`btn-ingresar ${bloqueado ? 'bloqueado' : ''}`}
            aria-disabled={bloqueado}
        >
            <span className='btn-ingresar-texto'>Ingresar</span>
        </button>
    );
}

export default BotonIngresar;