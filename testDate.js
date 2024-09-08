const testDates = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
  
    console.log('start:', start);
    console.log('end:', end);
    console.log('Is valid start:', !isNaN(start.getTime()));
    console.log('Is valid end:', !isNaN(end.getTime()));
  };
  
  testDates('2023-10-01T00:00:00Z', '2023-10-01T23:59:59Z');
  