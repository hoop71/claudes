import { subDays, startOfDay, endOfDay } from 'date-fns';

export async function reportCommand(options) {
  try {
    // Dynamic import of reporter
    const reporter = await import('../reporter.js');

    // Parse date range
    let startDate, endDate;

    if (options.start && options.end) {
      startDate = startOfDay(new Date(options.start));
      endDate = endOfDay(new Date(options.end));
    } else {
      const days = parseInt(options.days);
      endDate = endOfDay(new Date());
      startDate = startOfDay(subDays(endDate, days));
    }

    // Generate report
    const reportOptions = {
      startDate,
      endDate,
      format: options.format
    };

    // Call the main report generation function
    if (typeof reporter.default === 'function') {
      await reporter.default();
    } else if (typeof reporter.generateReport === 'function') {
      const report = await reporter.generateReport(reportOptions);
      console.log(report);
    } else {
      // Fallback: just execute the reporter module which outputs to stdout
      // This works if reporter.js is structured to run when imported
      console.log('Report generated (check reporter.js output)');
    }
  } catch (error) {
    console.error('Error generating report:', error.message);
    process.exit(1);
  }
}
