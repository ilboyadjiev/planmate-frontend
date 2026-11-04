import { centreSquare, loadPhoto } from './shrinkPhoto';

test('the centre square of a landscape and a portrait photo', () => {
    expect(centreSquare(1200, 800)).toEqual({ x: 200, y: 0, width: 800, height: 800 });
    expect(centreSquare(600, 900)).toEqual({ x: 0, y: 150, width: 600, height: 600 });
});

test('files that are not pictures are refused before anything is loaded', async () => {
    await expect(loadPhoto(new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' }))).rejects.toThrow('not-an-image');
    await expect(loadPhoto(null)).rejects.toThrow('not-an-image');
});
