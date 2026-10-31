import React from 'react';
import { format, addDays } from 'date-fns';

const PlanMateDateFns = () => {
    const date = new Date();
    const formattedDate = format(date, 'yyyy/MM/dd');
    const dateAfterThreeDays = addDays(date, 3);

    return (
        <div>
            <p>Today's date: {formattedDate}</p>
            <p>Date after three days: {format(dateAfterThreeDays, 'yyyy/MM/dd')}</p>
        </div>
    );
};

export default PlanMateDateFns;
