import React, { useEffect, useRef } from 'react';
import { context, interact, move, nonce } from './socket';

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current !== null && context.value === undefined) {
      context.value = canvasRef.current.getContext('2d')!;
    }
  }, [canvasRef]);
  return (
    <>
      <canvas id='dummyid' ref={ canvasRef } />
      <div className='table'>
        <div>&nbsp;</div>
        <div><button className='move' onClick={ () => move('up') }>UP</button></div>
        <div>&nbsp;</div>
        <div><button className='move' onClick={ () => move('left') }>LEFT</button></div>
        <div><button className='interact' onClick={ () => interact() }>INTERACT</button></div>
        <div><button className='move' onClick={ () => move('right') }>RIGHT</button></div>
        <div>&nbsp;</div>
        <div><button className='move' onClick={ () => move('down') }>DOWN</button></div>
        <div>&nbsp;</div>
      </div>
      <pre>Nonce: { nonce }</pre>
    </>
  );
};

export default App;