import { getNumberOfDays, calculatePercentage } from '../../../js/app/utils/globalFunctions';

describe('This test concern GlobalFunctions Class', () => {
  it('Should return the number of days between 2 dates', () => {
    const expectedResult = [14, 31, 90, 92, 365];
    const datesArray = [
      {
        date1: '2017-02-14T00:00:00Z',
        date2: '2017-02-28T00:00:00Z'
      },
      {
        date1: '2017-03-01T00:00:00Z',
        date2: '2017-04-01T00:00:00Z'
      },
      {
        date1: '2017-01-01T00:00:00Z',
        date2: '2017-04-01T00:00:00Z'
      },
      {
        date1: '2017-05-01T00:00:00Z',
        date2: '2017-08-01T00:00:00Z'
      },
      {
        date1: '2017-01-01T00:00:00Z',
        date2: '2018-01-01T00:00:00Z'
      }
    ];
    const result = datesArray.map((elm) => {
      const date1 = new Date(elm.date1);
      const date2 = new Date(elm.date2);
      const days = getNumberOfDays(date2, date1);
      return days;
    });
    expect(result).toEqual(expectedResult);
  });

  it('Should return a percentage', () => {
    const expectedResult = [43.48, 7.49, 7.8];
    const arr = [
      {
        value: 10,
        total: 23
      },
      {
        value: 32,
        total: 427
      },
      {
        value: 684,
        total: 8765
      }
    ];
    const result = arr.map((elm) => {
      const percentage = calculatePercentage(elm.value, elm.total);
      return percentage;
    });
    expect(result).toEqual(expectedResult);
  });
});